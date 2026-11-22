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
  assert.deepEqual(sum, { id: "r1", candidateKey: "k", status: "running", waitingGate: null, waitingGateId: null, currentNodeIds: ["deliver"], failedNodeIds: [], cancelledNodeIds: [], models: {}, templateId: null, error: null, waitingSince: null, history: [], nodeStatuses: LOOP_V1.nodes.map((n) => ({ id: n.id, name: n.name, type: n.type, status: n.id === "deliver" ? "ready" : "succeeded", error: null, artifacts: [] })) });   // P1：summarizeRun 增三字段（waitingSince/history/nodeStatuses），形状断言随语义更新
});
test("advanceRun 终态：全 succeeded 才收口（评审 R4 采纳·拆例②）", () => {
  let run = mkRun({ g1: "succeeded", build: "succeeded", verify: "succeeded", g2: "succeeded", "mr-open": "succeeded", "mr-push-check": "succeeded", "mr-open-check": "succeeded", deliver: "succeeded" });   // M6 三件套补态
  run = advanceRun(run);
  assert.equal(run.status, "succeeded");
  const sum = summarizeRun({ ...run, id: "r1", candidateKey: "k" });
  assert.deepEqual(sum, { id: "r1", candidateKey: "k", status: "succeeded", waitingGate: null, waitingGateId: null, currentNodeIds: [], failedNodeIds: [], cancelledNodeIds: [], models: {}, templateId: null, error: null, waitingSince: null, history: [], nodeStatuses: LOOP_V1.nodes.map((n) => ({ id: n.id, name: n.name, type: n.type, status: "succeeded", error: null, artifacts: [] })) });   // P1：summarizeRun 增三字段，形状断言随语义更新
});
test("summarizeRun.cancelledNodeIds + templateId（M7 T5/评审 D3/D6）", () => {
  const run = mkRun({ g1: "succeeded", build: "cancelled", verify: "cancelled" }, { id: "r9", candidateKey: "k", status: "cancelled", waitingGate: null, templateId: "loop-v1" });
  const sum = summarizeRun(run);
  assert.deepEqual(sum.cancelledNodeIds.sort(), ["build", "verify"]);
  // M8 T2/D3：models 映射（在途 agent 非空 model；snapshot 缺席安全退化 {}——评审附注 a/b）
  const mRun = { id: "r10", candidateKey: "k", status: "running", waitingGate: null,
    snapshot: { nodes: [{ id: "design", type: "agent" }, { id: "x", type: "script" }] },
    nodeStates: { design: { status: "running", model: "glm-x" }, x: { status: "running", model: null } } };
  assert.deepEqual(summarizeRun(mRun).models, { design: "glm-x" });
  assert.deepEqual(summarizeRun({ id: "r", candidateKey: "k", status: "running", nodeStates: {} }).models, {});
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

// ---- P1 小债 D：等待时长数据面（docs/plans/2026-11-22-p1-uiux-upgrade-implementation-plan.md Task 1）----
test("gateArrive waitingSince：三参落字（ISO），缺参不产生该键（P1 小债 D）", () => {
  const base = mkRun({ g1: "succeeded", build: "succeeded", verify: "succeeded" }, { id: "r1", candidateKey: "k" });
  const withTs = gateArrive({ ...base }, "g2", "2026-01-01T00:00:00Z");
  assert.equal(withTs.status, "waiting");
  assert.equal(withTs.waitingSince, "2026-01-01T00:00:00Z");
  const without = gateArrive({ ...base }, "g2");
  assert.equal("waitingSince" in without, false, "缺参零行为变化");
});

test("summarizeRun P1 三新字段：waitingSince 按 status 收口 / history 截 20 / nodeStatuses 投影（P1 小债 D）", () => {
  const history = Array.from({ length: 21 }, (_, i) => ({ at: "t" + i, event: "e" + i, detail: "" }));
  const run = {
    id: "r2", candidateKey: "k", status: "waiting", waitingGate: "g2", waitingGateId: "G2",
    waitingSince: "2026-01-01T00:00:00Z",
    nodeStates: { g1: { status: "succeeded", error: null }, build: { status: "failed", error: "boom" }, verify: { status: "pending", error: null }, g2: { status: "waiting", error: null } },
    snapshot: { nodes: [ { id: "g1", name: "G1", type: "gate" }, { id: "build", name: "build", type: "agent" }, { id: "verify", name: "verify", type: "script" }, { id: "g2", name: "G2", type: "gate" } ] },
    history, templateId: "loop-v1",
  };
  const sum = summarizeRun(run);
  assert.equal(sum.waitingSince, "2026-01-01T00:00:00Z");
  assert.equal(sum.history.length, 20);
  assert.equal(sum.history[0].event, "e1", "slice(-20) 丢最老一条");
  assert.deepEqual(sum.nodeStatuses, [
    { id: "g1", name: "G1", type: "gate", status: "succeeded", error: null, artifacts: [] },
    { id: "build", name: "build", type: "agent", status: "failed", error: "boom", artifacts: [] },
    { id: "verify", name: "verify", type: "script", status: "pending", error: null, artifacts: [] },
    { id: "g2", name: "G2", type: "gate", status: "waiting", error: null, artifacts: [] },
  ]);
  const done = summarizeRun({ ...run, status: "succeeded", waitingGate: null });
  assert.equal(done.waitingSince, null, "非 waiting 态恒 null（rev-plan S1 收口）");
  const bare = summarizeRun({ id: "r3", candidateKey: "k", status: "running", waitingGate: null, nodeStates: {} });
  assert.deepEqual(bare.nodeStatuses, [], "snapshot 缺失 → 空数组");
  assert.deepEqual(bare.history, []);
  assert.equal(bare.waitingSince, null);
});

// ---- P2 Task 4：nodeStatuses artifacts 投影（截 2 条/每条截 500 字符）----
test("summarizeRun nodeStatuses artifacts 投影截断（P2 Task 4）", () => {
  const long = "x".repeat(501);
  const run = { id: "r", candidateKey: "k", status: "running", waitingGate: null, nodeStates: { build: { status: "succeeded", error: null, artifacts: ["a1", long, "a3"] } }, snapshot: { nodes: [{ id: "build", name: "build", type: "script" }] } };
  const sum = summarizeRun(run);
  assert.deepEqual(sum.nodeStatuses[0].artifacts, ["a1", "x".repeat(500)]);
  const bare = summarizeRun({ id: "r2", candidateKey: "k", status: "running", waitingGate: null, nodeStates: {} });
  assert.deepEqual(bare.nodeStatuses, []);
});
